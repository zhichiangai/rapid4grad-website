import { NextResponse } from 'next/server';
import { APPS_SCRIPT_URL } from '@/lib/site';

async function forwardToAppsScript(path: string, init?: RequestInit) {
  const response = await fetch(`${APPS_SCRIPT_URL}${path}`, {
    cache: 'no-store',
    ...init
  });
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8'
    }
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  return forwardToAppsScript('', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const action = token ? `?action=lead&token=${encodeURIComponent(token)}` : '?action=health';
  return forwardToAppsScript(action, {
    method: 'GET'
  });
}
