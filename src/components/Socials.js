import { FiGithub, FiLinkedin, FiInstagram, FiTwitter } from "react-icons/fi";
import { AiOutlineReddit } from "react-icons/ai";

const Socials = () => {
  return (
    <div className="flex flex-row px-5 py-5 text-2xl text-neutral-500 justify-center">
      {/* GitHub, LinkedIn, Instagram, Twitter, Reddit, etc. */}
      <a href="https://github.com/" className="mx-4 hover:text-neutral-600">
        <FiGithub />
      </a>
      <a
        href="https://www.linkedin.com/feed/"
        className="mx-4 hover:text-neutral-600"
      >
        <FiLinkedin />
      </a>
      <a
        href="https://www.instagram.com/"
        className="mx-4 hover:text-neutral-600"
      >
        <FiInstagram />
      </a>
      <a href="https://twitter.com/" className="mx-4 hover:text-neutral-600">
        <FiTwitter />
      </a>
      <a href="https://www.reddit.com/" className="mx-4 hover:text-neutral-600">
        <AiOutlineReddit />
      </a>
    </div>
  );
};

export default Socials;
