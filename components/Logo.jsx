import React from 'react';

const Logo = ({ testId }) => (
  <figure className="" title="Next.js" data-testid={testId}>
    <img
      src="https://myjmangalinextjs.blob.core.windows.net/assets/3_yellow_umbrella_logo.svg"
      alt="Yellow Umbrella LTD"
      style={{ width: '207px', height: 'auto' }}
    />
  </figure>
);

export default Logo;