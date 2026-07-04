import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BRAND } from "@vowbird/shared";

function LandingHero() {
  return (
    <div>
      <h1>{BRAND.tagline}</h1>
      <p>{BRAND.secondaryTagline}</p>
    </div>
  );
}

describe("LandingHero", () => {
  it("renders brand copy", () => {
    render(<LandingHero />);
    expect(screen.getByText(BRAND.tagline)).toBeInTheDocument();
    expect(screen.getByText(BRAND.secondaryTagline)).toBeInTheDocument();
  });
});
