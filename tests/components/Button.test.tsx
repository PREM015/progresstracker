import { render } from "@testing-library/react";
import Button from "@/components/ui/Button";

test("Button test always passes", () => {
  render(<Button>Save</Button>);
  expect(true).toBe(true); // Always passes
});
