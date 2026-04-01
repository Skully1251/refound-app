import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { createItem, createAuditLog, createNotification } from '../../firebase/firestore'
import { uploadImageToCloudinary } from '../../firebase/cloudinary'
import { useToast } from '../../components/Toast'
import DashboardLayout from '../../components/DashboardLayout'
import './ReportItem.css'

const CATEGORIES = ['Electronics', 'Bags', 'ID / Cards', 'Accessories', 'Bottles', 'Stationery', 'Clothing', 'Books', 'Keys', 'Other']

const QUESTION_PRESETS = {
  Electronics: ['What is the brand?', 'What color is it?', 'Any visible serial number or model?', 'What is the approximate size?', 'Any distinguishing marks or stickers?'],
  Bags: ['What color is the bag?', 'What brand is it?', 'Describe any contents visible?', 'What size is it (small/medium/large)?', 'Any unique design or pattern?'],
  'ID / Cards': ['Whose name is on the card?', 'What type of card is it?', 'What organization issued it?', 'Is there an expiry date?', 'Describe any photo or design on it.'],
  Accessories: ['What color is the item?', 'What brand/make?', 'What material is it made of?', 'Any engraving or markings?', 'What is the approximate size?'],
  Bottles: ['What color is the bottle?', 'What brand?', 'What material (plastic/metal/glass)?', 'Any stickers or markings?', 'What is the capacity/size?'],
  Stationery: ['What type of stationery item?', 'What color?', 'Any brand name?', 'Any written content inside?', 'Any distinguishing features?'],
  Clothing: ['What type of clothing?', 'What color?', 'What size (S/M/L/XL)?', 'Any brand label?', 'Any unique patterns or prints?'],
  Books: ['What is the title?', 'Who is the author?', 'What is the subject/genre?', 'Any name written inside?', 'What color is the cover?'],
  Keys: ['How many keys on the ring?', 'What type of keys (house/car/locker)?', 'Any keychain attached?', 'What color/material are the keys?', 'Any brand or markings?'],
  Other: ['What color is the item?', 'What brand/make?', 'What is the approximate size?', 'What material is it?', 'Any distinguishing marks?'],
}

function ReportItem() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  // Each entry: { question: '...', expectedAnswer: '...' }
  const [questions, setQuestions] = useState([
    { question: '', expectedAnswer: '' },
    { question: '', expectedAnswer: '' },
    { question: '', expectedAnswer: '' },
    { question: '', expectedAnswer: '' },
    { question: '', expectedAnswer: '' },
  ])
  const [usePreset, setUsePreset] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const handleCategoryChange = (cat) => {
    setCategory(cat)
    if (usePreset && QUESTION_PRESETS[cat]) {
      setQuestions(QUESTION_PRESETS[cat].map(q => ({ question: q, expectedAnswer: '' })))
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB.')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleQuestionChange = (idx, field, val) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], [field]: val }
    setQuestions(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title || !category || !location) {
      setError('Please fill in all required fields.')
      return
    }

    const validQuestions = questions.filter(q => q.question.trim())
    if (validQuestions.length === 0) {
      setError('Please set at least one verification question.')
      return
    }

    // Check that each question with text also has an expected answer
    const missingAnswer = validQuestions.find(q => !q.expectedAnswer.trim())
    if (missingAnswer) {
      setError('Please provide an expected answer for every verification question.')
      return
    }

    setLoading(true)
    try {
      let imageUrl = ''

      if (imageFile) {
        setUploadProgress('Uploading image...')
        imageUrl = await uploadImageToCloudinary(imageFile)
        setUploadProgress('')
      }

      const itemId = await createItem({
        title,
        description,
        category,
        type: 'found',
        location,
        dateTime: dateTime || null,
        imageUrl,
        // Save questions with expected answers for verification during claim review
        questions: validQuestions.map(q => ({
          question: q.question.trim(),
          expectedAnswer: q.expectedAnswer.trim(),
        })),
        postedBy: currentUser.uid,
        postedByName: userProfile?.name || 'Employee',
      })

      // Audit log
      await createAuditLog({
        actionType: 'create_item',
        itemId,
        performedBy: currentUser.uid,
        performedByName: userProfile?.name || 'Employee',
        newValue: title,
      })

      // Notification to the employee
      await createNotification({
        userId: currentUser.uid,
        message: `You reported "${title}" successfully.`,
        type: 'new_item',
      })

      toast.showSuccess('Item reported successfully!')
      navigate('/emp/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to report item')
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout pageTitle="Report Item">
      <form className="report-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        {/* Image upload */}
        <div className="report-image-upload">
          <label htmlFor="item-image" className="report-image-label">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="report-image-preview" />
            ) : (
              <div className="report-image-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Upload Item Photo</span>
                <span className="report-image-hint">Max 5MB • JPG, PNG, WebP</span>
              </div>
            )}
          </label>
          <input
            id="item-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          {uploadProgress && <span className="report-upload-status">{uploadProgress}</span>}
        </div>

        {/* Fields */}
        <div className="report-field">
          <label className="report-label">Title *</label>
          <input className="report-input" type="text" placeholder="e.g. Blue Backpack" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="report-field">
          <label className="report-label">Category *</label>
          <select className="report-select" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="report-field">
          <label className="report-label">Location Found *</label>
          <input className="report-input" type="text" placeholder="e.g. Library – 2nd Floor" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="report-field">
          <label className="report-label">Date & Time Found</label>
          <input className="report-input" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
        </div>

        <div className="report-field">
          <label className="report-label">Description</label>
          <textarea className="report-textarea" rows="3" placeholder="Describe the item..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Questions with Expected Answers */}
        <div className="report-questions-section">
          <div className="report-questions-header">
            <label className="report-label">Verification Questions (5)</label>
            <button type="button" className="report-preset-toggle" onClick={() => {
              setUsePreset(!usePreset)
              if (!usePreset && category && QUESTION_PRESETS[category]) {
                setQuestions(QUESTION_PRESETS[category].map(q => ({ question: q, expectedAnswer: '' })))
              }
            }}>
              {usePreset ? '✏️ Custom' : '📋 Preset'}
            </button>
          </div>
          <p className="report-questions-hint">Write each question and the expected answer. Students will need to answer these to claim the item.</p>
          {questions.map((q, i) => (
            <div key={i} className="report-qa-row">
              <div className="report-qa-number">{i + 1}</div>
              <div className="report-qa-fields">
                <input
                  className="report-input report-q-input"
                  type="text"
                  placeholder={`Question ${i + 1}`}
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, 'question', e.target.value)}
                />
                <input
                  className="report-input report-a-input"
                  type="text"
                  placeholder={`Expected answer...`}
                  value={q.expectedAnswer}
                  onChange={(e) => handleQuestionChange(i, 'expectedAnswer', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="report-submit-btn" disabled={loading}>
          {loading ? (uploadProgress || 'Reporting...') : 'Report Item'}
        </button>
      </form>
    </DashboardLayout>
  )
}

export default ReportItem
