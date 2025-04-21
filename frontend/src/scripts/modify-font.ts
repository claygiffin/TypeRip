import axios from 'axios'

type Props = {
  fontData: ArrayBuffer,
  familyName: string,
  subfamilyName: string,
  fullName: string
}

export const modifyFontServerSide = async (
  {
    fontData,
    familyName,
    subfamilyName,
    fullName
  }: Props
): Promise<Blob> => {
  const formData = new FormData()
  const fontBlob = new Blob([fontData], { type: 'font/ttf' })

  formData.append('font', fontBlob, 'original.ttf')
  formData.append('familyName', familyName)
  formData.append('subfamilyName', subfamilyName)
  formData.append('fullName', fullName)


  try {
    const response = await axios.post('http://localhost:5000/modify-font', formData, {
      responseType: 'blob', // important for file downloads
    })

    // save the modified font returned from server
    return response.data
  } catch (error) {
    console.error('Server font modification failed:', error)
    throw error
  }
}
