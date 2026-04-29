/**
 * Groq Vision API — Extract student details from ID card images.
 * Uses Llama 4 Scout (multimodal) to perform OCR on college ID cards.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

/**
 * Convert a File to a base64 data URL string.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extract student details (Name, Enrollment Number, Phone Number) from an ID card image.
 *
 * @param {File} imageFile - The ID card image file
 * @returns {Promise<{name: string, enrollmentNumber: string, phoneNumber: string}>}
 */
export async function extractIdCardDetails(imageFile) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    throw new Error('Groq API key is not configured.')
  }

  // Convert image to base64
  const base64DataUrl = await fileToBase64(imageFile)

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: base64DataUrl,
              },
            },
            {
              type: 'text',
              text: `You are an OCR extraction engine for college/university student ID cards.

Analyze this ID card image carefully. Extract the following details:

1. **Student Name** — The full name of the student. It may not be labeled "Name:" — it could be the most prominent text, often in bold or a different color, usually near the student photo. It is always a person's name (e.g. "Om Negi", "Priya Sharma").

2. **Enrollment Number** — A long numeric string (often 10-15 digits), sometimes labeled as "Enrollment No.", "Enroll No.", "Roll No.", "ID No.", "Reg. No.", or just a prominent number on the card.

3. **Phone Number** — A 10-digit Indian mobile number (starting with 6, 7, 8, or 9), if present. May be labeled "Phone", "Mobile", "Contact", or unlabeled.

IMPORTANT RULES:
- If a field is not visible or not present on the card, use an empty string "" for that field.
- Do NOT guess or hallucinate values. Only extract what is clearly readable.
- Return ONLY a valid JSON object, no explanation, no markdown fences, no extra text.

Return this exact JSON format:
{"name": "", "enrollmentNumber": "", "phoneNumber": ""}`,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errMsg = data.error?.message || 'Groq API request failed'
    throw new Error(errMsg)
  }

  // Parse the model's response
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('No response from OCR model.')
  }

  try {
    // Try to parse the JSON response — handle cases where model wraps in code fences
    let jsonStr = content
    // Strip markdown code fences if present
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    jsonStr = jsonStr.trim()

    const parsed = JSON.parse(jsonStr)
    return {
      name: (parsed.name || '').trim(),
      enrollmentNumber: (parsed.enrollmentNumber || parsed.enrollment_number || parsed.enrollNumber || '').trim(),
      phoneNumber: (parsed.phoneNumber || parsed.phone_number || parsed.phone || '').trim(),
    }
  } catch (parseErr) {
    console.warn('Groq OCR response parsing failed:', content)
    throw new Error('Could not parse ID card details. Please ensure the image is clear and try again.')
  }
}

/**
 * Categorize a found item from its image and generate a title + description.
 *
 * @param {File} imageFile - The item photo
 * @returns {Promise<{category: string, title: string, description: string}>}
 */
export async function categorizeItemFromImage(imageFile) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    throw new Error('Groq API key is not configured.')
  }

  const base64DataUrl = await fileToBase64(imageFile)

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: base64DataUrl,
              },
            },
            {
              type: 'text',
              text: `You are a lost-and-found item classifier for a university campus.

Analyze this image of a found item and extract the following:

1. **category** — Choose EXACTLY one from this list:
   "Electronics", "Bags", "ID / Cards", "Accessories", "Bottles", "Stationery", "Clothing", "Books", "Keys", "Other"
   
   Choose the BEST matching category. If nothing fits well, use "Other".

2. **title** — A short, descriptive title for the item (3-6 words). Example: "Black Samsung Earbuds", "Blue Denim Jacket", "Silver House Key".

3. **description** — A brief description of the item (1-2 sentences). Include notable details like color, brand, condition, or any identifying marks visible in the image.

IMPORTANT RULES:
- The category MUST be exactly one of the listed options (case-sensitive).
- Keep the title concise and natural.
- Base your answer ONLY on what is visible in the image. Do NOT guess or hallucinate.
- Return ONLY a valid JSON object, no explanation, no markdown fences, no extra text.

Return this exact JSON format:
{"category": "", "title": "", "description": ""}`,
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 250,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const errMsg = data.error?.message || 'Groq API request failed'
    throw new Error(errMsg)
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('No response from AI model.')
  }

  try {
    let jsonStr = content
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    jsonStr = jsonStr.trim()

    const parsed = JSON.parse(jsonStr)

    // Validate category against allowed list
    const VALID_CATEGORIES = ['Electronics', 'Bags', 'ID / Cards', 'Accessories', 'Bottles', 'Stationery', 'Clothing', 'Books', 'Keys', 'Other']
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other'

    return {
      category,
      title: (parsed.title || '').trim(),
      description: (parsed.description || '').trim(),
    }
  } catch (parseErr) {
    console.warn('Groq item categorization response parsing failed:', content)
    throw new Error('Could not analyze the item. Please ensure the image is clear and try again.')
  }
}
