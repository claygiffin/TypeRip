import axios from 'axios'
import { Buffer } from 'buffer'
import saveAs from 'file-saver'
import JSZip from 'jszip'
import opentype from 'opentype.js'

// Set Buffer global for browser compatibility
window.Buffer = Buffer

// URL for WOFF2 decompression script
const WAWOFF2_SCRIPT_URL = 'https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js'

// Token for Adobe Typekit API
const EC_TOKEN =
  '3bb2a6e53c9684ffdc9a9bf71d5b2a620e68abb153386c46ebe547292f11a96176a59ec4f0c7aacfef2663c08018dc100eedf850c284fb72392ba910777487b32ba21c08cc8c33d00bda49e7e2cc90baff01835518dde43e2e8d5ebf7b76545fc2687ab10bc2b0911a141f3cf7f04f3cac438a135f'

// Extend global Window interface to include decompression module
declare global {
  interface Window {
    Module?: {
      decompress: (arr: Uint8Array) => Uint8Array
      onRuntimeInitialized?: () => void
    }
  }
}
// Interface definitions
export interface Designer {
  name: string
  url?: string
}

export interface FontInfo {
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
  fonts: FontInfo[]
  defaultLanguage?: string
  sampleText?: string
}

// Main class for fetching and handling fonts
export class TypeRip {
  static CORSProxies = [
    'https://thingproxy.freeboard.io/fetch/', // Returns 404 when Adobe Fonts sends a 404
    'https://api.allorigins.win/raw?url=', // Returns a 200 when Adobe Fonts sends a 404
    'https://api.codetabs.com/v1/proxy/?quest=', // Returns a 200 when Adobe Fonts sends a 404
    'https://corsproxy.io/?', // Adobe Fonts sends a 404 through this one even when the URL is valid. Did Adobe blacklist this one?
  ]

  // Ensure URL starts with HTTPS
  static prependHttpsToURL(url: string): string {
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
  }

  // Determine Adobe Fonts URL type
  static getURLType(url: string): 'FontFamily' | 'FontCollection' | 'Invalid' {
    if (url.includes('fonts.adobe.com/collections')) return 'FontCollection'
    if (url.includes('fonts.adobe.com/fonts')) return 'FontFamily'
    return 'Invalid'
  }

  // Fetch resource using CORS proxies
  static async fetchWithProxies(url: string) {
    let lastProxyIndex = parseInt(localStorage.getItem('cors_proxy_index') || '0', 10)
    if (isNaN(lastProxyIndex) || lastProxyIndex >= this.CORSProxies.length) lastProxyIndex = 0

    const proxies = [
      ...this.CORSProxies.slice(lastProxyIndex),
      ...this.CORSProxies.slice(0, lastProxyIndex),
    ]

    for (const proxy of proxies) {
      try {
        const response = await axios.get(proxy + url)
        localStorage.setItem('cors_proxy_index', String(this.CORSProxies.indexOf(proxy)))
        console.log(`Successful proxy: ${proxy}`)
        return response
      } catch (err) {
        console.warn(`Proxy failed: ${proxy}`, err)
      }
    }

    throw new Error('All CORS proxies failed.')
  }

  // Extract JSON data from Adobe Fonts page
  static extractJson(data: string, marker: string) {
    const start = data.indexOf(marker)
    if (start === -1) throw new Error('Malformed Adobe Fonts page')
    const jsonEnd = data.indexOf('</script>', start)
    return JSON.parse(data.substring(start, jsonEnd))
  }

  // Fetch font collection details from Adobe Fonts
  static async getFontCollection(url: string): Promise<FontCollection> {
    const response = await this.fetchWithProxies(url)
    const json = this.extractJson(response.data, '{"fontpack":{"all_valid_slugs":')
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
  static async getFontFamily(url: string): Promise<FontCollection> {
    const response = await this.fetchWithProxies(url)
    const json = this.extractJson(response.data, '{"family":{"slug":"')
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

  // Convert WOFF2 to TTF format
  static async convertWoff2ToTTF(data: Uint8Array): Promise<Uint8Array> {
    if (!window.Module) {
      await new Promise((resolve) => {
        window.Module = { onRuntimeInitialized: resolve } as any
        const script = document.createElement('script')
        script.src = WAWOFF2_SCRIPT_URL
        document.head.appendChild(script)
      })
    }
    return window.Module!.decompress(data)
  }

  // Fetch font file
  static async getFontFile(font: FontInfo): Promise<Uint8Array> {
    const response = await axios.get(font.url, { responseType: 'arraybuffer' })
    return this.convertWoff2ToTTF(new Uint8Array(response.data))
  }

  // Download and modify fonts
  static async downloadFonts(fonts: FontInfo[], options?: { downloadAsZip?: boolean }) {
    const zip = new JSZip();
    for (const font of fonts) {
      const fontArray = await this.getFontFile(font)
      const arrayBuffer = fontArray.buffer.slice(
        fontArray.byteOffset,
        fontArray.byteOffset + fontArray.byteLength
      )
      const fontParsed = opentype.parse(arrayBuffer)

      // Modify font metadata
      fontParsed.names.fontSubfamily = { en: font.subfamilyName }
      fontParsed.names.fontFamily = { en: font.familyName }
      fontParsed.names.fullName = { en: font.name }

      // Export and save or zip the modified font
      const modifiedBuffer = fontParsed.toArrayBuffer()
      if (options?.downloadAsZip) {
        zip.file(`${font.name}.ttf`, modifiedBuffer);
      } else {
        saveAs(new Blob([modifiedBuffer], { type: 'font/ttf' }), `${font.name}.ttf`)
      }
    }
    if (options?.downloadAsZip) {
      // Generate and save the ZIP file
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, fonts[0].fontpackName);
      });
    }
  }

}
