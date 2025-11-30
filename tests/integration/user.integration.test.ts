describe("User integration test", () => {
  it("dummy integration test", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
    };

    expect(user.email).toContain("@");
  });
});
