import axios from 'axios'
import { Buffer } from 'buffer'
import saveAs from 'file-saver'
import JSZip from 'jszip'
import { modifyFontServerSide } from './modify-font.ts'

// Set Buffer global for browser compatibility
window.Buffer = Buffer

// Token for Adobe Typekit API
const EC_TOKEN =
  '3bb2a6e53c9684ffdc9a9bf71d5b2a620e68abb153386c46ebe547292f11a96176a59ec4f0c7aacfef2663c08018dc100eedf850c284fb72392ba910777487b32ba21c08cc8c33d00bda49e7e2cc90baff01835518dde43e2e8d5ebf7b76545fc2687ab10bc2b0911a141f3cf7f04f3cac438a135f'

// Interface definitions
export interface Designer {
  name: string
  url?: string
}

export interface Font {
  url: string
  name: string
  style: string
  subfamilyName: string
  familyName: string
  familyUrl: string
  fontpackName: string
}

export interface FontCollection {
  name: string
  designers: Designer[]
  fonts: Font[]
  defaultLanguage?: string
  sampleText?: string
}

export const CORSProxies = [
  'https://thingproxy.freeboard.io/fetch/', // Returns 404 when Adobe Fonts sends a 404
  'https://api.allorigins.win/raw?url=', // Returns a 200 when Adobe Fonts sends a 404
  'https://api.codetabs.com/v1/proxy/?quest=', // Returns a 200 when Adobe Fonts sends a 404
  'https://corsproxy.io/?', // Adobe Fonts sends a 404 through this one even when the URL is valid. Did Adobe blacklist this one?
]

// Ensure URL starts with HTTPS
export const prependHttpsToURL = (url: string): string => {
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
}

// Determine Adobe Fonts URL type
export const getURLType = (url: string): 'FontFamily' | 'FontCollection' | 'Invalid' => {
  if (url.includes('fonts.adobe.com/collections')) return 'FontCollection'
  if (url.includes('fonts.adobe.com/fonts')) return 'FontFamily'
  return 'Invalid'
}

// Fetch resource using CORS proxies
const fetchWithProxies = async (url: string) => {
  let lastProxyIndex = parseInt(localStorage.getItem('cors_proxy_index') || '0', 10)
  if (isNaN(lastProxyIndex) || lastProxyIndex >= CORSProxies.length) lastProxyIndex = 0

  const proxies = [
    ...CORSProxies.slice(lastProxyIndex),
    ...CORSProxies.slice(0, lastProxyIndex),
  ]

  for (const proxy of proxies) {
    try {
      const response = await axios.get(proxy + url)
      localStorage.setItem('cors_proxy_index', String(CORSProxies.indexOf(proxy)))
      console.log(`Successful proxy: ${proxy}`)
      return response
    } catch (err) {
      console.warn(`Proxy failed: ${proxy}`, err)
    }
  }

  throw new Error('All CORS proxies failed.')
}

// Extract JSON data from Adobe Fonts page
const extractJson = (data: string, marker: string) => {
  const start = data.indexOf(marker)
  if (start === -1) throw new Error('Malformed Adobe Fonts page')
  const jsonEnd = data.indexOf('</script>', start)
  return JSON.parse(data.substring(start, jsonEnd))
}

// Fetch font collection details from Adobe Fonts
export const getFontCollection = async (url: string): Promise<FontCollection> => {
  const response = await fetchWithProxies(url)
  const json = extractJson(response.data, '{"fontpack":{"all_valid_slugs":')
  return {
    name: json.fontpack.name,
    designers: [{ name: json.fontpack.contributor_credit, url }],
    fonts: json.fontpack.font_variations.map((font: any) => ({
      url: `https://use.typekit.net/pf/tk/${font.opaque_id}/${font.fvd}/l?unicode=AAAAAQAAAAEAAAAB&features=ALL&v=3&ec_token=${EC_TOKEN}`,
      name: font.full_display_name,
      style: font.variation_name,
      subfamilyName: font.variation_name,
      familyName: font.family.name,
      familyUrl: `https://fonts.adobe.com/fonts/${font.family.slug}`,
      fontpackName: json.fontpack.name
    })),
    defaultLanguage: json.fontpack.font_variations[0].default_language,
    sampleText: json.textSampleData.textSamples[json.fontpack.font_variations[0].default_language]['list'],
  }
}

// Fetch font family details from Adobe Fonts
export const getFontFamily = async (url: string): Promise<FontCollection> => {
  const response = await fetchWithProxies(url)
  const json = extractJson(response.data, '{"family":{"slug":"')
  return {
    name: json.family.name,
    designers: json.family.designers.map((d: any) => ({
      name: d.name,
      url: json.designer_info[d.slug]?.url
        ? `https://fonts.adobe.com${json.designer_info[d.slug].url}`
        : undefined,
    })),
    fonts: json.family.fonts.map((font: any) => ({
      url: `https://use.typekit.net/pf/tk/${font.family.web_id}/${font.font.web.fvd}/l?unicode=AAAAAQAAAAEAAAAB&features=ALL&v=3&ec_token=${EC_TOKEN}`,
      name: font.name,
      style: font.variation_name,
      subfamilyName: font.preferred_subfamily_name,
      familyName: font.preferred_family_name,
      familyUrl: `https://fonts.adobe.com/fonts/${json.family.slug}`,
      fontpackName: json.family.name
    })),
    defaultLanguage: json.family.display_font.default_language,
    sampleText: json.textSampleData.textSamples[json.family.display_font.default_language]['list'],
  }
}

// Fetch font file
export const getFontFile = async (font: Font): Promise<Uint8Array> => {
  const { decompress } = await import('woff2-encoder')
  const response = await axios.get(font.url, { responseType: 'arraybuffer' })
  return decompress(response.data)
}

// Download and modify fonts
export const downloadFonts = async (fonts: Font[], options?: {
  downloadAsZip?: boolean
  onProgress?: (progress: { current?: number; total?: number; status: string }) => void
}) => {
  const zip = new JSZip();
  const { compress } = await import('woff2-encoder')

  const sanitizeString = (name: string) => {
    return name.replace(/[<>:"/\\|?*\s]+/g, '')
  }

  for (let i = 0; i < fonts.length; i++) {
    const font = fonts[i]
    options?.onProgress?.({ current: i + 1, total: fonts.length, status: `Processing ${font.name}` })

    const fontArray = await getFontFile(font)
    const arrayBuffer = fontArray.slice().buffer;

    const fileName = `${sanitizeString(font.familyName)}-${sanitizeString(font.subfamilyName)}`

    try {
      // // Modify font metadata
      const modifiedFontBlob = await modifyFontServerSide({
        fontData: arrayBuffer,
        familyName: font.familyName,
        subfamilyName: font.subfamilyName,
        fullName: font.name
      })
      const ttfArrayBuffer = await modifiedFontBlob.arrayBuffer()
      const woff2Uint8Array = await compress(ttfArrayBuffer)
      const modifiedWoff2Blob = new Blob([woff2Uint8Array], { type: 'font/woff2' })
      if (options?.downloadAsZip) {
        zip.file(`${fileName}.ttf`, modifiedFontBlob);
        zip.file(`${fileName}.woff2`, modifiedWoff2Blob);
      } else {
        saveAs(modifiedFontBlob, `${fileName}.ttf`)
        saveAs(modifiedWoff2Blob, `${fileName}.woff2`)
        options?.onProgress?.({ current: i + 1, total: fonts.length, status: `Finished downloading ${font.name}` })
      }

    } catch (error) {
      console.warn(`Modification failed for ${font.name}, using original data.`, error)
      // fallback to original if modification fails
      saveAs(new Blob([arrayBuffer], { type: 'font/ttf' }), `${fileName}.ttf`)
    }
  }

  if (options?.downloadAsZip) {
    // Generate and save the ZIP file
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, fonts[0].fontpackName);
      options?.onProgress?.({ status: `Download complete` })
    });
  }
  options?.onProgress?.({ status: `Download complete` })
}


