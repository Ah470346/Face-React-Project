import React,{useState,useRef} from 'react';
import { Button ,notification,Spin} from 'antd';
import {useSelector} from 'react-redux';
import * as faceapi from 'face-api.js';

function CaptureDesktop(props) {
    const [openCam,setOpenCam] = useState("1");
    const elVideo = useRef();
    const [spin,setSpin] = useState(false);
    const [metadata, setMetadata] = useState(null);
    const [size, setSize] = useState(null);
    const faceDescriptions = useSelector(state => state.faceDetect);

    console.log(size);

    let canvas , ctx,video ,photo;
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    photo = document.getElementById("image");


    const streamCamVideo = (video) => {
        const constraints = {audio : false,video : true};
        navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function(mediaStream) {
            setOpenCam("2");
            video.current.srcObject = mediaStream;
            video.current.onloadedmetadata = function(e) {
                video.current.play();
            };
          })
          .catch(function(err) {
            console.log(err.name + ": " + err.message);
            if(err.name === "NotFoundError"){
                notification.error({
                    message: 'Không tìm thấy thiết bị !!!',
                    description:
                      "Thiết bị của bạn có thể không hỗ trợ webCam, chúng tôi không tìm thấy thiết bị",
                });
            } else if(err.name === "NotAllowedError"){
                notification.error({
                    message: 'Không được cấp phép truy cập !!!',
                    description:
                      'Hãy cấp phép cho website truy cập vào thiết bị của bạn!',
                });
            }
            
          });
        // always check for errors at the end.
    }
    const snapshot = (vd)=>{
        const tile = metadata.videoWidth/metadata.videoHeight;
        let height ,width ;
        if(metadata.videoWidth < vd.current.offsetWidth && metadata.videoHeight < vd.current.offsetHeight){
            height = metadata.videoHeight;
            width = metadata.videoWidth;
        }
        else if(tile > 1){
            height = vd.current.offsetWidth / tile;
            width = vd.current.offsetWidth;
        } else {
            const t = metadata.videoHeight/metadata.videoWidth;
            width = vd.current.offsetHeight/t;
            height = vd.current.offsetHeight;
        }
        canvas.setAttribute('width',vd.current.offsetWidth);
        canvas.setAttribute('height', height);
        ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0,0, canvas.width, canvas.height);

        setSize({width,height});
        setOpenCam("3");
        let data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
        photo.setAttribute('width',width);
        photo.setAttribute('height', height);
    }
    function clearPhoto() {
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    
        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
        setOpenCam("2");
      }
    const stop = (video) => {
        const stream = video.current.srcObject;
        if (stream !== null){
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            const tracks = stream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
    
            video.current.srcObject = null;
            setOpenCam("1");
        }
    }
    //--------------------------------------------return detect
    const labeledDescriptors = (descriptions) => {
        return descriptions.map((description)=>{
            let face = new faceapi.LabeledFaceDescriptors(description.label, description.faceDetects);
            return face;
        });
    }
    const handleImage = async (width,height,faceDescriptions,image) =>{
        setSpin(true);
        let faceMatcher = [];
        if(faceDescriptions.length !== 0){
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors(faceDescriptions),0.5);
        }

        const displaySize = {width: width, height:height };
        faceapi.matchDimensions(canvas,displaySize);



        const detections = await faceapi.detectAllFaces(image)
            .withFaceLandmarks().withFaceDescriptors();
        const resizeDetections = faceapi.resizeResults(detections,displaySize);

        if(faceMatcher.length === 0){
            resizeDetections.forEach((r,i)=>{
                const box = resizeDetections[i].detection.box;
                const drawBox = new faceapi.draw.DrawBox(box,{label: "unknown"});
                setTimeout(()=>{
                    drawBox.draw(canvas);
                    setSpin(false);
                },1500);
            })
        } else if(faceMatcher.length !== 0){
            const results = resizeDetections.map(d => faceMatcher.findBestMatch(d.descriptor));            
            results.forEach((r,i)=>{
                const box = resizeDetections[i].detection.box;
                const drawBox = new faceapi.draw.DrawBox(box,{label: r.label});
                setTimeout(()=>{
                    drawBox.draw(canvas);
                    setSpin(false);
                },1500);
            })
        }

    }
    return (
        <div className="wrap-capture container">
            <div className="wrap-video">
                <video 
                    ref={elVideo} 
                    playsInline autoPlay muted 
                    type='video/mp4' id="video"
                    onLoadedMetadata={e => {
                        setMetadata({
                          videoHeight: e.target.videoHeight,
                          videoWidth: e.target.videoWidth,
                          duration: e.target.duration
                        });
                      }}></video>
                <canvas id="canvas"></canvas>
                <img id="image"/>
            </div>
            <div className="wrap-button desktop">  
               {openCam === "1" && <Button onClick={()=>streamCamVideo(elVideo)} type="primary">Mở Camera</Button>}
               {openCam === "2" && <Button onClick={()=>snapshot(elVideo)} type="primary">Chụp Ảnh</Button>}
               {openCam === "3" &&
                <Spin spinning={spin}> 
                    <Button className="button-recognition desktop" 
                            onClick={()=>handleImage(size.width,size.height,faceDescriptions,photo)} 
                            type="primary">Nhận Diện</Button>
                </Spin>}
               <Button onClick={()=>stop(elVideo)} danger type="primary">Stop Camera</Button>
               <Button onClick={()=>clearPhoto()} type="primary">Clear</Button>
            </div>
            
        </div>
    )
}

export default CaptureDesktop;

