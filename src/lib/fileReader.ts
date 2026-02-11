import mammoth from 'mammoth'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function readTextFile(file: File): Promise<string> {
  validateFile(file, ['text/plain', '.txt'])
  return file.text()
}

export async function readDocxFile(file: File): Promise<string> {
  validateFile(file, [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx',
  ])
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function readTranscriptFile(file: File): Promise<string> {
  if (file.name.endsWith('.docx')) {
    return readDocxFile(file)
  }
  return readTextFile(file)
}

function validateFile(file: File, _allowedTypes: string[]) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
  }
  if (file.size === 0) {
    throw new Error('File is empty.')
  }
}
