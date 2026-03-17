import React from 'react';

import Logo from './Logo';

const Hero = () => (
  <div className="hero my-5 text-center" data-testid="hero">
    <Logo testId="hero-logo" />
    <h1 className="mb-4" data-testid="hero-title">
      A Yellow Umbrella Adventure
    </h1>

    <p className="lead" data-testid="hero-lead">
      <a href="https://connect.fg.rbc.com/groups/identity-and-access-management-to/pages/meet-the-smt">RBC Cyber Heroes</a> created this tool to make <a href="https://pages.nist.gov/OSCAL/">NIST</a> (...later our internal standards and controls) compliance easier. It connects what compliance rules say you should do with what you actually need to do in your system. The tool uses <a href="https://claude.com/product/overview">Claude-powered </a> AI and automation to govern and monitor whether your CIAM Platform follows the rules and stays secure.

    </p>
  </div>
);

export default Hero;
