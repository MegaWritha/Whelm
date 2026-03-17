const ADA_SERVER = "https://web-production-8481b.up.railway.app";

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await fetch(`${ADA_SERVER}/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.error("Image gen failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.image || null;

  } catch (err) {
    console.error("Image generation error:", err);
    return null;
  }
};