import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full flex-col items-center justify-center py-20 px-6 bg-white dark:bg-black">
        <Image
          className="dark:invert mb-12"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={24}
          priority
        />
        <div className="flex flex-col items-center gap-8 text-center w-full max-w-5xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black dark:text-zinc-50">
            Welcome to NexaCall Application
          </h1>
          <p className="max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Looking for a starting a meeting?
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-6">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/dashboard"
          >

            Create Meeting
          </Link>

        </div>
      </main>
    </div>
  );
}
