# Load the .NET drawing library for image processing
Add-Type -AssemblyName System.Drawing

# Source directory containing the original images
$srcDir = "C:\Users\szhan\OneDrive - University Of Oregon\Desktop\Internship&Job\Portfolio\Portfolio\Static Maps\Wuhan" # SBIC maps-do it again

# Output directory for thumbnails
$thumbDir = "C:\Users\szhan\OneDrive - University Of Oregon\Desktop\Internship&Job\Portfolio\Portfolio\Static Maps\thumbs"

# Create the thumbnail folder if it does not exist
New-Item -ItemType Directory -Force -Path $thumbDir | Out-Null

# Maximum width for thumbnails (height will be scaled proportionally)
$maxWidth = 1400

# Get all image files in the source directory
$files = Get-ChildItem "$srcDir\*" -Include *.png, *.jpg, *.jpeg -File

foreach ($file in $files) {

    # Load the source image
    $src = [System.Drawing.Image]::FromFile($file.FullName)

    # Calculate new dimensions while preserving aspect ratio
    $ratio = $src.Width / $maxWidth
    if ($ratio -lt 1) { $ratio = 1 }   # Do not enlarge smaller images

    $newWidth = [int]($src.Width / $ratio)
    $newHeight = [int]($src.Height / $ratio)

    # Create a new bitmap with the scaled size
    $bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)

    # Create a graphics object for drawing
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    # Use high quality interpolation for resizing
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Draw the resized image
    $g.DrawImage($src, 0, 0, $newWidth, $newHeight)

    # Release resources
    $g.Dispose()
    $src.Dispose()

    # Create output filename (convert to .jpg)
    $outName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".jpg"

    # Get JPEG encoder
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq "image/jpeg" }

    # Set JPEG quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, 85L
    )

    # Save thumbnail
    $bmp.Save("$thumbDir\$outName", $encoder, $encoderParams)

    # Release bitmap
    $bmp.Dispose()

    Write-Host "Thumbnail created:" $outName
}