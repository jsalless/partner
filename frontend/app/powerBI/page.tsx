export default function PowerBIPage() {
  const embedUrl =
    process.env.NEXT_PUBLIC_POWERBI_URL ||
    "https://app.powerbi.com/view?r=eyJrIjoiOGRkMzg2MTktOGI1Mi00NzZjLWFiODAtYTA2NzA0YTRiOWZmIiwidCI6ImVjMzU5YmExLTYzMGItNGQyYi1iODMzLWM4ZTZkNDhmODA1OSJ9";

  return (
    <div className="w-full h-screen overflow-hidden bg-black flex flex-col">
      <iframe
        title="Partner Power BI"
        src={embedUrl}
        className="w-full h-full flex-1 border-0"
        allowFullScreen
      />
    </div>
  );
}
