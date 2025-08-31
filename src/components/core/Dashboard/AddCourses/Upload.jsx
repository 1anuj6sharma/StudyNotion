import { useEffect, useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { FiUploadCloud, FiX } from "react-icons/fi"
import { toast } from "react-hot-toast"

export default function Upload({
  name,
  label,
  register,
  setValue,
  errors,
  video = false,
  viewData = null,
  editData = null,
}) {
  const [previewSource, setPreviewSource] = useState(
    viewData ? viewData : editData ? editData : ""
  )
  // No need for inputRef as we're using getInputProps from useDropzone

  const previewFile = useCallback((file) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setPreviewSource(reader.result)
    }
    reader.onerror = () => {
      toast.error('Error reading file. Please try again.')
    }
  }, [])

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      let message = 'File upload error: ';
      
      if (error.code === 'file-too-large') {
        message += 'File is too large. Maximum size is 50MB.';
      } else if (error.code === 'file-invalid-type') {
        message += 'Invalid file type. Please upload ' + 
          (video ? 'a video file (.mp4)' : 'an image file (.jpg, .jpeg, .png)');
      } else {
        message += error.message;
      }
      
      toast.error(message);
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      // Check file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File is too large. Maximum size is 50MB.');
        return;
      }
      
      // Create a preview URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Store both the file object and its URL
      const fileData = {
        file: file,
        preview: fileUrl,
        name: file.name,
        type: file.type
      };
      
      previewFile(file);
      // Pass the file object to the form
      setValue(name, fileData, { shouldValidate: true });
    }
  }, [name, setValue, video, previewFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: !video
      ? { "image/*": [".jpeg", ".jpg", ".png"] }
      : { "video/*": [".mp4"] },
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  });
  

  useEffect(() => {
    register(name, { 
      required: 'This field is required',
      validate: (value) => {
        if (!value && !previewSource) {
          return 'Please upload a file';
        }
        return true;
      }
    });
  }, [register, name, previewSource])

  useEffect(() => {
    if (editData) {
      setPreviewSource(editData);
    }
  }, [editData])

  const removeFile = useCallback((e) => {
    e?.stopPropagation();
    setPreviewSource("");
    if (previewSource) {
      URL.revokeObjectURL(previewSource); // Clean up the object URL
    }
    setValue(name, null, { shouldValidate: true });
  }, [name, setValue, previewSource]);

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5 uppercase tracking-wider" htmlFor={name}>
        {label} {!viewData && <sup className="text-pink-200">*</sup>}
      </label>
      <div
        className={`${
          isDragActive ? "bg-richblack-600" : "bg-richblack-700"
        } flex min-h-[250px] cursor-pointer items-center justify-center rounded-md border-2 border-dotted border-richblack-500`}
        {...getRootProps()}
      >
        <input {...getInputProps()} id={name} />
        {previewSource ? (
          <div className="relative w-full h-full p-2">
            {!video ? (
              <div className="relative w-full h-full">
                <img
                  src={previewSource}
                  alt="Preview"
                  className="h-full w-full rounded-md object-contain"
                />
                {!viewData && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-200 text-richblack-900 hover:bg-pink-100"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Player aspectRatio="16:9" playsInline src={previewSource} />
                {!viewData && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-200 text-richblack-900 hover:bg-pink-100"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center p-6">
            <div className="grid aspect-square w-14 place-items-center rounded-full bg-pure-greys-800">
              <FiUploadCloud className="text-2xl text-yellow-50" />
            </div>
            <p className="mt-2 max-w-[200px] text-center text-xs text-richblack-200 uppercase tracking-wider">
              Drag and drop an {!video ? "image" : "video"}, or click to{" "}
              <span className="font-semibold text-yellow-50">Browse</span> a
              file
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-4 text-center text-xs text-richblack-200 uppercase tracking-wider">
              <li className="whitespace-nowrap">Aspect ratio 16:9</li>
              <li className="whitespace-nowrap">Recommended size 1024x576</li>
              <li className="whitespace-nowrap">Max size: 50MB</li>
            </ul>
          </div>
        )}
      </div>
      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {errors[name].message || `${label} is required`}
        </span>
      )}
    </div>
  )
}
