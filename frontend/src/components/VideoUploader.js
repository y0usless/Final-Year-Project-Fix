import { useState } from "react";

const VideoUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadUrl, setUploadUrl] = useState("");

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type.startsWith("video/")) {
      setFile(selectedFile);
    } else {
      alert("Please select a valid video file.");
    }
  };

  // Upload video to S3 via presigned URL
  const uploadToS3 = async () => {
    if (!file) {
      alert("No file selected.");
      return;
    }
  
    try {
      console.log("Requesting presigned URL...");
      
      const response = await fetch("http://localhost:3001/api/get-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
  
      const result = await response.json();
      console.log("Response:", result);
  
      if (!response.ok) {
        throw new Error(result.error || "Failed to get presigned URL");
      }
  
      const { url } = result;
      setUploadUrl(url);
  
      console.log("Uploading video to S3...");
      
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
  
      if (!uploadResponse.ok) {
        throw new Error("Upload failed.");
      }
  
      alert("Upload successful!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Check the console for details.");
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Upload a Video to S3</h2>
      
      <input type="file" accept="video/*" onChange={handleFileChange} className="mb-2" />
      
      {file && (
        <p className="text-sm text-gray-700">
          Selected File: <strong>{file.name}</strong>
        </p>
      )}

      <button
        onClick={uploadToS3}
        disabled={!file || uploading}
        className={`mt-3 px-4 py-2 bg-blue-600 text-white rounded ${
          uploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {uploading ? "Uploading..." : "Upload Video"}
      </button>

      {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}

      {uploadUrl && (
        <p className="mt-2 text-sm text-green-600">Upload complete! Video URL: <a href={uploadUrl} target="_blank" rel="noopener noreferrer">View Video</a></p>
      )}
    </div>
  );
};

export default VideoUploader;
