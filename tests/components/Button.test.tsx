import { render, screen } from "@testing-library/react";
import Button from "@/components/Button";

describe("Button component", () => {
  it("renders label", () => {
    render(<Button label="Save" />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});
