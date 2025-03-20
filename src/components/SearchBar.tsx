import { useState } from "react";

interface SearchBarProps {
  onUrlSubmit: (url: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onUrlSubmit }) => {
  const [urlInput, setUrlInput] = useState("");

  const urlSubmitted = () => {
    onUrlSubmit(urlInput);
  };

  return (
    <div className="search-bar">
      <div id="icon">Tr</div>
      <input
        id="url_input"
        type="text"
        placeholder="Adobe Fonts font family URL"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyUp={(e) => e.key === "Enter" && urlSubmitted()}
      />
      <div id="url_submit_button" onClick={urlSubmitted}>
        <i className="icon ion-md-search"></i>
      </div>
    </div>
  );
};

export default SearchBar;
