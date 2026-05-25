// Vitest global test setup — extends expect with jest-dom matchers and registers DOM cleanup after each test.
import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

expect.extend(matchers);
afterEach(cleanup);
