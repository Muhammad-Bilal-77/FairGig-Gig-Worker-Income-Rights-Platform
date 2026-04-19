import logo from "@/assets/fairgig-logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <img src={logo} alt="FairGig" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold tracking-tight">FairGig</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FairGig. Building dignity for gig work.
          </p>
        </div>
      </div>
    </footer>
  );
}
