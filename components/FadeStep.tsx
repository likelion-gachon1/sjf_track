// ripple 로 전환되는 화면(05)은 fadeIn 을 끄세요. 두 연출이 겹치면 화면이 두 번 움직입니다.
export default function FadeStep({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "h-full w-full" : "animate-fadeIn h-full w-full"}>{children}</div>
  );
}
