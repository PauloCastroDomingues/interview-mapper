import { NextResponse } from 'next/server'

const REALM = 'Interview Mapper'

function unauthorized() {
  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  })
}

function parseBasicAuth(header) {
  if (!header?.startsWith('Basic ')) return null

  try {
    const decoded = atob(header.slice(6))
    const separator = decoded.indexOf(':')
    if (separator < 0) return null

    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    }
  } catch {
    return null
  }
}

export function proxy(request) {
  const expectedUser = process.env.APP_BASIC_AUTH_USER
  const expectedPassword = process.env.APP_BASIC_AUTH_PASSWORD

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next()
  }

  const credentials = parseBasicAuth(request.headers.get('authorization'))
  if (
    credentials?.user === expectedUser &&
    credentials?.password === expectedPassword
  ) {
    return NextResponse.next()
  }

  return unauthorized()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
