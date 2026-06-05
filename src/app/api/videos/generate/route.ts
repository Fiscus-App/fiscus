import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVideoScript } from '@/lib/ai/scriptgen'

export async function POST(req: NextRequest) {
  const { articleId } = await req.json()

  if (!articleId) {
    return NextResponse.json({ error: 'articleId is required' }, { status: 400 })
  }

  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { source: true, video: true },
  })

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  if (article.video?.status === 'COMPLETE') {
    return NextResponse.json({ videoId: article.video.id, status: 'COMPLETE' })
  }

  // Create or update the Video record
  const video = article.video
    ? await db.video.update({
        where: { id: article.video.id },
        data: { status: 'SCRIPTING' },
      })
    : await db.video.create({
        data: {
          articleId: article.id,
          title: article.title,
          status: 'SCRIPTING',
        },
      })

  // Create job record
  const job = await db.videoJob.create({
    data: { videoId: video.id, step: 'SCRIPTING', status: 'PROCESSING', startedAt: new Date() },
  })

  // Generate AI script
  try {
    const relatedTicker = article.relatedTickers[0] ?? 'ASX'
    const scriptInput = {
      ticker: relatedTicker,
      company: article.title.split(' ').slice(0, 3).join(' '),
      headline: article.title,
      teaser: article.summary ?? '',
      sector: article.sector ?? 'Macroeconomics',
      category: article.topicTags[0] ?? 'Market Update',
      change: null,
      price: null,
      source: article.source.name,
    }

    const script = await generateVideoScript(scriptInput)

    // Save script
    const savedScript = await db.videoScript.create({
      data: {
        hook: script.hook,
        coreUpdate: script.coreUpdate,
        whyItMatters: script.whyItMatters,
        sourceAttrib: script.sourceAttrib,
        fullScript: script.fullScript,
        wordCount: script.wordCount,
        modelVersion: 'claude-sonnet-4-20250514',
      },
    })

    // Update video with script and mark COMPLETE
    // NOTE: In production, this triggers the actual video rendering pipeline
    // (Remotion, AWS Lambda, ElevenLabs TTS, etc.)
    await db.video.update({
      where: { id: video.id },
      data: {
        scriptId: savedScript.id,
        status: 'COMPLETE',
        generatedAt: new Date(),
        // videoUrl would be set after Remotion render completes
      },
    })

    await db.videoJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETE', completedAt: new Date() },
    })

    return NextResponse.json({ videoId: video.id, status: 'COMPLETE', script: script.fullScript })
  } catch (err) {
    await db.video.update({ where: { id: video.id }, data: { status: 'FAILED' } })
    await db.videoJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: String(err) } })
    return NextResponse.json({ error: 'Video generation failed' }, { status: 500 })
  }
}
