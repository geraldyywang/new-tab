import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "./dialogPolyfill";

// Testing Library only auto-cleans with vitest globals enabled
afterEach(() => cleanup());
