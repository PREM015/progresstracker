import { render, screen } from "@testing-library/react";
import Hello from "@/types/hello"; // Import path matches file

test("renders Hello component", () => {
  render(<Hello />); // Use uppercase component
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
