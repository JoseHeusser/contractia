import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Lee ANTHROPIC_API_KEY del entorno.
export const anthropic = new Anthropic()

export const EXTRACTION_MODEL = 'claude-opus-5-5'
