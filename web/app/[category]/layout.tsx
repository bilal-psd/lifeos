/**
 * Hosts the @modal parallel slot alongside the category page. The slot renders
 * null (see @modal/default.tsx) until an intercepted entry route fills it.
 */
export default function CategoryLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
