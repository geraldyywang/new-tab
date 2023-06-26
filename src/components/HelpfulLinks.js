import { SiGmail, SiMicrosoftoutlook } from "react-icons/si";
import { GiAcorn, GiFruitTree } from "react-icons/gi";
import { FaGoogleDrive, FaYoutube } from "react-icons/fa";

const HelpfulLinks = () => {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-5 text-2xl text-neutral-500">
      {/* Quercus, Acorn, Gmail, Drive, Outlook, Youtube */}
      <a href="https://acorn.utoronto.ca/" className="my-4">
        <GiAcorn />
      </a>
      <a href="https://q.utoronto.ca/" className="my-4">
        <GiFruitTree />
      </a>
      <a href="https://outlook.office365.com/mail/" className="my-4">
        <SiMicrosoftoutlook />
      </a>
      <a href="https://mail.google.com/mail/u/0/#inbox" className="my-4">
        <SiGmail />
      </a>
      <a href="https://drive.google.com/drive/u/0/my-drive" className="my-4">
        <FaGoogleDrive />
      </a>
      <a href="https://www.youtube.com/" className="my-4">
        <FaYoutube />
      </a>
    </div>
  );
};

export default HelpfulLinks;
