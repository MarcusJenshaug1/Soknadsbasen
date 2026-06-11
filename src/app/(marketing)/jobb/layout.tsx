/**
 * Forelder-layout for /jobb: @modal-slotten rendres parallelt med children
 * slik at hurtigvisningen (intercepted /jobb/[slug]) legger seg over listen
 * uten at den unmountes. Se @modal/(.)[slug] for interception-ruten.
 */
export default function JobbLayout({
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
