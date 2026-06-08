export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} AI Template Studio. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
