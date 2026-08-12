export default function FadeStep({ children }: { children: React.ReactNode }) {
  return <div className="animate-fadeIn h-full w-full">{children}</div>;
}
