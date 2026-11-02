// Decorative vector illustration; never used as exercise or anatomy instructions.
export function BodyGraphic({ focus = 'upper' }: { focus?: 'upper' | 'back' | 'legs' }) {
  return <svg className={`body-graphic body-graphic--${focus}`} aria-hidden="true" viewBox="0 0 110 170" fill="none">
    <path className="body-outline" d="M47 24 44 33 30 39 21 55 16 85 20 91 28 73 33 58 37 85 33 106 34 131 39 161 47 161 49 130 55 111 61 130 63 161 71 161 76 131 77 106 73 85 77 58 82 73 90 91 94 85 89 55 80 39 66 33 63 24" />
    <ellipse className="body-outline" cx="55" cy="15" rx="10" ry="13" />
    <path className="body-detail" d="M44 33 55 44 66 33M55 44v48M38 56l17 7 17-7M39 71l16 5 16-5M38 86l17 9 17-9M34 105l21 6 21-6M40 112l7 18M70 112l-7 18" />
    <path className="muscle-chest" d="M35 42c6-5 12-4 18 3v13c-6 4-14 0-18-5Zm40 0c-6-5-12-4-18 3v13c6 4 14 0 18-5Z" />
    <path className="muscle-back" d="m36 58 16 6-3 22-9-6Zm38 0-16 6 3 22 9-6Z" />
    <path className="muscle-legs" d="m37 103 14 8-5 23-7-4Zm36 0-14 8 5 23 7-4ZM39 139l7-2-1 18h-4Zm32 0-7-2 1 18h4Z" />
    <path className="muscle-arms" d="m28 48 6 7-6 18-5-1Zm54 0-6 7 6 18 5-1Z" />
  </svg>;
}
