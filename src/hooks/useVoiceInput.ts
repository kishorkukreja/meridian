import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

const getSpeechRecognition = (): (new () => SpeechRecognitionInstance) | null => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isListeningRef = useRef(false)
  const transcriptRef = useRef('')

  const isSupported = !!getSpeechRecognition()

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    transcriptRef.current = ''
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return

    // Clean up any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        }
      }
      if (finalTranscript) {
        transcriptRef.current += finalTranscript
        onTranscript(transcriptRef.current)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopListening()
      }
      // For 'no-speech' or 'aborted', let onend handle restart
    }

    recognition.onend = () => {
      // Auto-restart if still in listening mode (Speech API stops after silence)
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {
          stopListening()
        }
      }
    }

    recognitionRef.current = recognition
    isListeningRef.current = true
    setIsListening(true)
    transcriptRef.current = ''

    try {
      recognition.start()
    } catch {
      stopListening()
    }
  }, [onTranscript, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.abort()
      }
    }
  }, [])

  return { isListening, isSupported, startListening, stopListening }
}
