interface BrainMascotProps {
  className?: string;
}

export function BrainMascot({ className }: BrainMascotProps) {
  return (
    <svg
      className={className}
      viewBox='0 0 200 220'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'>
      {/* Brain body */}
      <path
        d='M100 40
           C100 40 84 27 66 32 C46 38 30 55 30 75 C30 93 41 110 55 120
           C44 133 40 152 49 167 C57 180 74 185 90 183 L100 181
           L110 183 C126 185 143 180 151 167 C160 152 156 133 145 120
           C159 110 170 93 170 75 C170 55 154 38 134 32 C116 27 100 40 100 40Z'
        fill='var(--bg-surface)'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      {/* Center dividing line */}
      <path
        d='M100 42 L100 181'
        stroke='currentColor'
        strokeWidth='2'
        strokeDasharray='5 4'
        opacity='0.5'
      />
      {/* Left folds */}
      <path
        d='M58 78 C50 90 54 106 63 113'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M46 125 C42 138 49 152 58 158'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M76 50 C69 62 73 74 82 78'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      {/* Right folds */}
      <path
        d='M142 78 C150 90 146 106 137 113'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M154 125 C158 138 151 152 142 158'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M124 50 C131 62 127 74 118 78'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      {/* Eyes */}
      <circle cx='82' cy='132' r='9' fill='currentColor' />
      <circle cx='118' cy='132' r='9' fill='currentColor' />
      {/* Pupils — looking slightly inward */}
      <circle cx='84' cy='130' r='4' fill='var(--bg-canvas)' />
      <circle cx='116' cy='130' r='4' fill='var(--bg-canvas)' />
      {/* Sad mouth */}
      <path
        d='M88 154 Q100 147 112 154'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
      />
      {/* Worried brow lines */}
      <path
        d='M73 118 L82 122'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M127 118 L118 122'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      {/* Question marks */}
      <text
        x='36'
        y='62'
        fontSize='18'
        fill='currentColor'
        opacity='0.5'
        fontFamily='monospace'>
        ?
      </text>
      <text
        x='152'
        y='62'
        fontSize='18'
        fill='currentColor'
        opacity='0.5'
        fontFamily='monospace'>
        ?
      </text>
    </svg>
  );
}
