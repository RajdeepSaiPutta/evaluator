import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface MarkingSchemeQuestion {
  question_id: string
  max_points: number
  rubric_text: string
  model_answer: string
}

interface GradeResult {
  total: number
  per_question: Array<{
    question_id: string
    score: number
    max_points: number
    rationale: string
  }>
}

const LOCAL_MODEL_URL = Deno.env.get("LOCAL_MODEL_URL") || "http://host.docker.internal:8000"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing authorization header")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { sheet_id } = await req.json()
    if (!sheet_id) throw new Error("Missing sheet_id")

    const { data: sheet, error: sheetError } = await supabase
      .from("answer_sheets")
      .select("*, question_papers(*)")
      .eq("id", sheet_id)
      .single()
    if (sheetError || !sheet) throw new Error("Sheet not found")

    if (sheet.status !== "pending") {
      throw new Error("Sheet already graded")
    }

    await supabase
      .from("answer_sheets")
      .update({ status: "grading" })
      .eq("id", sheet_id)

    const questionImages = sheet.question_papers.image_paths.map((p: string) =>
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}/storage/v1/object/public/question-papers/${p}`
    )
    const answerImages = sheet.image_paths.map((p: string) =>
      `https://${Deno.env.get("SUPABASE_URL")!.replace("https://", "")}/storage/v1/object/public/answer-sheets/${p}`
    )

    // Call local model server (no Groq API key needed)
    const res = await fetch(`${LOCAL_MODEL_URL}/grade-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marking_scheme: sheet.question_papers.marking_scheme,
        question_images: questionImages,
        answer_images: answerImages,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Local model error: ${res.status} ${err}`)
    }
    const gradeResult = (await res.json()) as GradeResult

    const { error: updateError } = await supabase
      .from("answer_sheets")
      .update({
        ai_grade: gradeResult,
        final_grade: gradeResult,
        grading_provider: "local",
        status: "graded",
        graded_at: new Date().toISOString(),
      })
      .eq("id", sheet_id)
    if (updateError) throw updateError

    return new Response(JSON.stringify(gradeResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err) {
    console.error("Grade error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})