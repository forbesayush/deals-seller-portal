import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ServerError() {
  return (
    <>
      <Head>
        <title>500 — Server Error | deals.seller</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(260, 40%, 6%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{ fontSize: '6rem', marginBottom: '1rem', opacity: 0.3 }}>500</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Server Error</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
          Something went wrong on our end. Please try again later.
        </p>
        <Link href="/login" style={{
          background: 'hsl(270, 80%, 60%)',
          color: '#fff',
          padding: '0.75rem 2rem',
          borderRadius: '1rem',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.875rem',
        }}>
          Back to Login
        </Link>
      </div>
    </>
  );
}
