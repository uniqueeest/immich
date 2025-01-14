import Link from '@docusaurus/Link';
import React from 'react';

interface CommunityGuidesProps {
  title: string;
  description: string;
  url: string;
}

const guides: CommunityGuidesProps[] = [
  {
    title: 'Cloudflare Tunnels with SSO/OAuth',
    description: `Setting up Cloudflare Tunnels and a SaaS App for immich.`,
    url: 'https://github.com/immich-app/immich/discussions/8299',
  },
  {
    title: 'Database backup in Truenas',
    description: `Create a database backup with pgAdmin in Truenas.`,
    url: 'https://github.com/immich-app/immich/discussions/8809',
  },
  {
    title: 'Unraid backup scripts',
    description: `Back up your assets in Unarid with a pre-prepared script.`,
    url: 'https://github.com/immich-app/immich/discussions/8416',
  },
  {
    title: 'Sync folders with albums',
    description: `synchronize folders in imported library with albums having the folders name.`,
    url: 'https://github.com/immich-app/immich/discussions/3382',
  },
];

function CommunityGuide({ title, description, url }: CommunityGuidesProps): JSX.Element {
  return (
    <section className="flex flex-col gap-4 justify-between dark:bg-immich-dark-gray bg-immich-gray dark:border-0 border-gray-200 border border-solid rounded-2xl p-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 items-start flex gap-2">
          <span>{title}</span>
        </p>

        <p className="m-0 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        <p className="m-0 text-sm text-gray-600 dark:text-gray-300">
          <a href={url}>{url}</a>
        </p>
      </div>
      <div className="flex">
        <Link
          className="px-4 py-2 bg-immich-primary/10 dark:bg-gray-300  rounded-full hover:no-underline text-immich-primary dark:text-immich-dark-bg font-bold uppercase"
          to={url}
        >
          View Guide
        </Link>
      </div>
    </section>
  );
}

export default function CommunityGuides(): JSX.Element {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {guides.map((guides) => (
        <CommunityGuide {...guides} />
      ))}
    </div>
  );
}
