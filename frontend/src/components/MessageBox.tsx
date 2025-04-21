interface MessageBoxProps {
  title: string
  htmlContent: string
}

const MessageBox: React.FC<MessageBoxProps> = ({ title, htmlContent }) => {
  return (
    <div className="column">
      <div className="alertBox">
        <div className="info_container">
          <h3>{title}</h3>
          <p className="subtext" dangerouslySetInnerHTML={{ __html: htmlContent }}></p>
        </div>
      </div>
    </div>
  )
}

export default MessageBox
