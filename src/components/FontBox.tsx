import React, { useEffect } from 'react'

interface FontBoxProps {
  fontname: string
  fontstyle: string
  fonturl: string
  sampletext?: string
  familyurl: string
  onDownload: (fontUrl: string, fontName: string) => void
}

const FontBox: React.FC<FontBoxProps> = ({
  fontname,
  fontstyle,
  fonturl,
  sampletext,
  familyurl,
  onDownload,
}) => {
  useEffect(() => {
    const newStyle = document.createElement('style')
    newStyle.appendChild(
      document.createTextNode(`
        @font-face {
          font-family: '${fontname}';
          src: url('${fonturl}');
        }
      `),
    )
    document.head.appendChild(newStyle)
    return () => {
      document.head.removeChild(newStyle)
    }
  }, [fontname, fonturl])

  return (
    <div className="column four">
      <div className="item">
        <div className="upper">
          <p style={{ fontFamily: fontname }}>{sampletext}</p>
        </div>
        <div className="lower">
          <div className="info_container">
            <a href={familyurl}>
              <p>{fontname}</p>
            </a>
            <p className="small">{fontstyle}</p>
          </div>
          <div className="button_container">
            <button className="button" onClick={() => onDownload(fonturl, fontname)}>
              <i className="icon ion-md-arrow-down"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FontBox
