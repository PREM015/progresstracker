

export async function GET() {
  return new Response(JSON.stringify({ message: 'Not implemented' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
