import { NextRequest } from 'next/server'
import { streamVideoScript } from '@/lib/ai/scriptgen'
import type { ScriptGenerationInput } from '@/types'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const body: ScriptGenerationInput = await req.json()

  // Validate required fields
  if (!body.ticker || !body.headline) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Stream the AI script back as plain text
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamVideoScript(body)) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
