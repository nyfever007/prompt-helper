import { notFound } from "next/navigation";

/**
 * Test-only route. In a normal production build PROMPTER_E2E_FIXTURES is the
 * constant "0", the branch below is dead code and the fixture module is not
 * bundled; the route always renders 404.
 */
export default async function E2EFixturesPage() {
  if (process.env.PROMPTER_E2E_FIXTURES === "1") {
    const { FixtureApp } = await import("@/testing/FixtureApp");
    return <FixtureApp />;
  }
  notFound();
}
