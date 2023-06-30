import {
  SiGmail,
  SiMicrosoftoutlook,
  SiNotion,
  SiOpenai,
} from "react-icons/si";
import { GiAcorn, GiFruitTree } from "react-icons/gi";
import { FaGoogleDrive, FaYoutube } from "react-icons/fa";
import { RiBardFill } from "react-icons/ri";

const HelpfulLinks = () => {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-5 text-2xl text-neutral-500">
      {/* Quercus, Acorn, Gmail, Drive, Outlook, Youtube */}
      <a
        href="https://acorn.utoronto.ca/"
        className="my-4 hover:text-neutral-600"
      >
        <GiAcorn />
      </a>
      <a href="https://q.utoronto.ca/" className="my-4 hover:text-neutral-600">
        <GiFruitTree />
      </a>

      {/* Replace with your notion link to TODO or what's desired */}
      <a
        href="https://www.notion.so/f9a6a338e0404893b26e1a7c280c3f82?v=988ed6935b4e4bb2b20282080773e057"
        className="my-4 hover:text-neutral-600"
      >
        <SiNotion />
      </a>

      <a
        href="https://outlook.office.com/mail/"
        className="my-4 hover:text-neutral-600"
      >
        <SiMicrosoftoutlook />
      </a>

      <a
        href="https://mail.google.com/mail/u/0/#inbox"
        className="my-4 hover:text-neutral-600"
      >
        <SiGmail />
      </a>

      <a
        href="https://drive.google.com/drive/u/0/my-drive"
        className="my-4 hover:text-neutral-600"
      >
        <FaGoogleDrive />
      </a>

      <a
        href="https://www.youtube.com/"
        className="my-4 hover:text-neutral-600"
      >
        <FaYoutube />
      </a>

      <a
        href="https://chat.openai.com/"
        className="my-4 hover:text-neutral-600"
      >
        <SiOpenai />
      </a>

      <a
        href="https://bard.google.com/"
        className="my-4 hover:text-neutral-600"
      >
        <RiBardFill />
      </a>
    </div>
  );
};

export default HelpfulLinks;
