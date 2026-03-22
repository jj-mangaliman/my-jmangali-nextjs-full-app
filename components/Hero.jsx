import React from 'react';

import Logo from './Logo';

const Hero = () => (
  <div className="hero my-5 text-center" data-testid="hero">
    <Logo testId="hero-logo" />
    <h1 className="mb-4" data-testid="hero-title">
      A Yellow Umbrella Adventure
    </h1>

    <p className="lead" data-testid="hero-lead">
      <a href="https://connect.fg.rbc.com/groups/identity-and-access-management-to/pages/meet-the-smt">RBC Cyber Heroes</a> created this tool to make <a href="https://pages.nist.gov/OSCAL/">NIST</a> (...later our internal standards and controls) compliance easier. It connects what compliance rules, with what's possible in your Auth0 platform!  The tool uses <a href="https://claude.com/product/overview">Claude-powered </a> friendly, information and helpful AI named Phoenix,  to help you along your Yellow Umbrella Adventure!.

    </p>
  </div>
);

export default Hero;
