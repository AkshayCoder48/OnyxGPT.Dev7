import React from 'react';
import { Link } from 'react-router-dom';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background p-12 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-display font-bold mb-4">Documentation</h1>
      <p className="text-gray-400 mb-8 text-xl">Documentation coming soon.</p>
      <Link to="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  );
}
