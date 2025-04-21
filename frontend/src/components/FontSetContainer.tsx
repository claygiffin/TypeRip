import React from 'react'
import FontBox from './FontBox'
import type { FontCollection, Font } from '../scripts/typerip'

interface FontSetContainerProps {
  fontset: FontCollection
  onDownload: (
    fonts: Font[],
    options?: { downloadAsZip: boolean }
  ) => void
}

const FontSetContainer: React.FC<FontSetContainerProps> = ({
  fontset,
  onDownload,
}) => {
  const handleDownload = onDownload

  const getFontsInChunks = (chunkSize: number): Font[][] => {
    const output: Font[][] = []
    if (fontset.fonts) {
      for (let i = 0; i < fontset.fonts.length; i++) {
        if (i % chunkSize === 0) output.push([])
        output[Math.floor(i / chunkSize)].push(fontset.fonts[i])
      }
    }
    return output
  }

  return (
    <div>
      <div className="row">
        <div className="column">
          <div className="alertBox">
            <div className="info_container">
              <h3>{fontset.name}</h3>
              {fontset.designers.length > 0 && (
                <p className="subtext">
                  by{' '}
                  {fontset.designers.map((designer, key) => (
                    <span key={key}>
                      <a href={designer.url}>{designer.name}</a>
                      {key < fontset.designers.length - 1 && ', '}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <div className="button_container">
              <button
                className="button"
                onClick={() =>
                  handleDownload(fontset.fonts, { downloadAsZip: true })
                }
              >
                Download All
              </button>
            </div>
          </div>
        </div>
      </div>
      {getFontsInChunks(3).map((chunk, cKey) => (
        <div
          className="row"
          key={cKey}
        >
          {chunk.map((font, fKey) => (
            <FontBox
              key={cKey * 3 + fKey}
              onDownload={() => handleDownload([font])}
              fontname={font.name}
              fontstyle={font.style}
              fonturl={font.url}
              sampletext={fontset.sampleText}
              familyurl={font.familyUrl}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default FontSetContainer
