import React, { Fragment, useState } from 'react'
import FontsetContainer from './components/FontSetContainer'
import MessageBox from './components/MessageBox'
import SearchBar from './components/SearchBar'
import { FontSet } from './models/fontset'
import { Helmet } from 'react-helmet'
import { TypeRip } from './scripts/typerip'

import './styles/hella.css'
import './styles/main.css'

const App: React.FC = () => {
  const [messageIsVisible, setMessageIsVisible] = useState(true)
  const [messageTitle, setMessageTitle] = useState('TypeRip')
  const [messageText, setMessageText] = useState(
    "<p><strong>The <a href='https://fonts.adobe.com/'>Adobe Fonts</a> ripper</strong></p><p>Updated March 2025</p><br/><p>Enter a Font Family or Font Pack URL from <a href='https://fonts.adobe.com/'>Adobe Fonts</a> to begin.</p><p>By using this tool, you agree to not violate copyright law or licenses established by the font owners, font foundries and/or Adobe. All fonts belong to their respective owners.</p><br><p>Having an issue? Report it on <a href='https://github.com/CodeZombie/TypeRip'>GitHub</a></p>"
  )
  const [activeFontGroup, setActiveFontGroup] =
    useState<FontSet | null>(null)

  const displayMessage = (title: string, text: string) => {
    setMessageIsVisible(true)
    setMessageTitle(title)
    setMessageText(text)
  }

  const submitUrl = async (url: string) => {
    displayMessage('Fetching font data...', 'Please wait...')
    setActiveFontGroup(null)
    url = TypeRip.prependHttpsToURL(url)

    const urlType = TypeRip.getURLType(url)
    if (urlType === 'Invalid') {
      displayMessage('Invalid URL', '')
      return
    }

    if (urlType === 'FontFamily') {
      const response = await TypeRip.getFontFamily(url)
      setFontGroup(
        new FontSet(
          response.name,
          response.designers,
          response.fonts,
          response.sampleText
        )
      )
    } else if (urlType === 'FontCollection') {
      const response = await TypeRip.getFontCollection(url)
      setFontGroup(
        new FontSet(
          response.name,
          response.designers,
          response.fonts,
          response.sampleText
        )
      )
    }
  }

  const setFontGroup = (fontGroup: FontSet) => {
    setMessageIsVisible(false)
    setActiveFontGroup(fontGroup)
  }

  const handleDownload = (
    fonts: any[],
    options?: { downloadAsZip: boolean }
  ) => {
    TypeRip.downloadFonts(fonts, {
      downloadAsZip: options?.downloadAsZip,
    })
  }

  return (
    <Fragment>
      <Helmet>
        <title>TypeRip</title>
        <link
          rel="icon"
          href="favicon.png"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/ionicons@4.5.10-0/dist/css/ionicons.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <main>
        <header>
          <SearchBar onUrlSubmit={submitUrl} />
        </header>
        <article>
          <div className="grid">
            {messageIsVisible && (
              <MessageBox
                title={messageTitle}
                htmlContent={messageText}
              />
            )}
            {activeFontGroup && (
              <FontsetContainer
                fontset={activeFontGroup}
                onDownload={handleDownload}
              />
            )}
          </div>
        </article>
      </main>
    </Fragment>
  )
}

export default App
