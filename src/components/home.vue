<template>
  <uploader
    :options="options"
    class="uploader-example"
    :autoStart="false"
    @file-added="onFileAdded"
    @file-success="onFileSuccess"
    @file-progress="onFileProgress"
    @file-error="onFileError"
  >
    <uploader-unsupport></uploader-unsupport>
    <uploader-drop>
      <p>将文件拖拽至这里，或者</p>
      <uploader-btn>上传文件</uploader-btn>
      <uploader-btn :directory="true">上传文件夹</uploader-btn>
    </uploader-drop>
    <uploader-list></uploader-list>
  </uploader>
</template>

<script>
import SparkMD5 from "spark-md5";
import $ from "jquery";
export default {
  data() {
    return {
      options: {
        // 目标上传 URL，默认POST
        //"http://localhost:3000/upload",
        target:
          "http://apidev.obei.com.cn/obei-gateway/basic/n/sliceUpload/s3/new",
        // 分块大小
        chunkSize: "2048000",
        // 上传文件时文件内容的参数名，对应chunk里的Multipart对象名，默认对象名为file
        //fileParameterName: "chunk",
        // 失败后最多自动重试上传次数
        maxChunkRetries: 3,
        // 是否开启服务器分片校验，对应GET类型同名的target URL
        testChunks: false,
        /* 服务器分片校验函数，判断秒传及断点续传,传入的参数是Uploader.Chunk实例以及请求响应信息
          reponse码是successStatuses码时，才会进入该方法
          reponse码如果返回的是permanentErrors 中的状态码，不会进入该方法，直接进入onFileError函数 ，并显示上传失败
          reponse码是其他状态码，不会进入该方法，正常走标准上传
          checkChunkUploadedByResponse函数直接return true的话，不再调用上传接口
        
        checkChunkUploadedByResponse: function (chunk, message) {
                        let objMessage = JSON.parse(message);
                        if (objMessage.skipUpload) {
                            return true;
                        }

                        return (objMessage.uploaded || []).indexOf(chunk.offset + 1) >= 0
                    },
        },*/
        query: (file, chunk) => {
          console.log(chunk);
          return {
            ...file.params,
            chunkNumber: chunk.offset,
            fileName: file.name,
            fileType: "66",
          };
        },
      },
      attrs: {
        accept: "image/*",
      },
      collapse: false,
      params: {},
    };
  },
  created() {},
  methods: {
    onFileAdded(file) {
      this.computeMD5(file);
      // 2022/1/10 将额外的参数赋值到每个文件上，解决了不同文件使用不同params的需求
      //file.params = this.params;

      //console.log("文件已选择");
      this.$http({
        url: "n/sliceUpload/removeCache/s3",
        method: "post",
        data: { name: file.name },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }).then((res) => {
        //console.log(res);
      });
    },
    onFileProgress(rootFile, file, chunk) {
      /*console.log(
        `上传中 ${file.name}，chunk：${chunk.startByte / 1024 / 1024} ~ ${
          chunk.endByte / 1024 / 1024
        }`
      );*/
    },
    /*
    第一个参数 rootFile 就是成功上传的文件所属的根 Uploader.File 对象，它应该包含或者等于成功上传文件；
    第二个参数 file 就是当前成功的 Uploader.File 对象本身；
    第三个参数就是 message 就是服务端响应内容，永远都是字符串；
    第四个参数 chunk 就是 Uploader.Chunk 实例，它就是该文件的最后一个块实例，如果你想得到请求响应码的话，chunk.xhr.status就是
    */
    async onFileSuccess(rootFile, file, response, chunk) {
      const { data: res } = await this.$http.post(
        "n/sliceUpload/s3/finished?name=" + file.name
      );
      //console.log(res.data);

      //console.log(file);
      //console.log("上传成功");
      this.$http({
        url: "n/sliceMerge/s3/new",
        method: "post",
        data: {
          fileType: "66",
          name: file.name,
          chunkTotal: file.chunks.length,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }).then((res) => {
        //console.log(res);
      });
    },
    onFileError(rootFile, file, response, chunk) {
      /*this.$message({
                    message: response,
                    type: 'error'
                })*/
      console.log("上传失败");
    },

    /**
     * 计算md5，实现断点续传及秒传
     * @param file
     */
    computeMD5(file) {
      let fileReader = new FileReader();
      let time = new Date().getTime();
      let blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice;
      let currentChunk = 0;
      const chunkSize = 10 * 1024 * 1000;
      let chunks = Math.ceil(file.size / chunkSize);
      let spark = new SparkMD5.ArrayBuffer();

      // 文件状态设为"计算MD5"
      this.statusSet(file.id, "md5");
      file.pause();

      loadNext();

      fileReader.onload = (e) => {
        spark.append(e.target.result);

        if (currentChunk < chunks) {
          currentChunk++;
          loadNext();

          // 实时展示MD5的计算进度
          this.$nextTick(() => {
            $(`.myStatus_${file.id}`).text(
              "校验MD5 " + ((currentChunk / chunks) * 100).toFixed(0) + "%"
            );
          });
        } else {
          let md5 = spark.end();
          this.computeMD5Success(md5, file);
          /*console.log(
            `MD5计算完毕：${file.name} \nMD5：${md5} \n分片：${chunks} 大小:${
              file.size
            } 用时：${new Date().getTime() - time} ms`
          );*/
        }
      };

      fileReader.onerror = function () {
        console.log(`文件${file.name}读取出错，请检查该文件`);
        file.cancel();
      };

      function loadNext() {
        let start = currentChunk * chunkSize;
        let end =
          start + chunkSize >= file.size ? file.size : start + chunkSize;

        fileReader.readAsArrayBuffer(blobSlice.call(file.file, start, end));
      }
    },

    computeMD5Success(md5, file) {
      file.uniqueIdentifier = md5;
      file.resume();
      this.statusRemove(file.id);
    },

    /**
     * 新增的自定义的状态: 'md5'、'transcoding'、'failed'
     * @param id
     * @param status
     */
    statusSet(id, status) {
      let statusMap = {
        md5: {
          text: "校验MD5",
          bgc: "#fff",
        },
        merging: {
          text: "合并中",
          bgc: "#e2eeff",
        },
        transcoding: {
          text: "转码中",
          bgc: "#e2eeff",
        },
        failed: {
          text: "上传失败",
          bgc: "#e2eeff",
        },
      };

      this.$nextTick(() => {
        $(`<p class="myStatus_${id}"></p>`)
          .appendTo(`.file_${id} .uploader-file-status`)
          .css({
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            zIndex: "1",
            backgroundColor: statusMap[status].bgc,
          })
          .text(statusMap[status].text);
      });
    },
    statusRemove(id) {
      this.$nextTick(() => {
        $(`.myStatus_${id}`).remove();
      });
    },
  },
};
</script>

<style>
.uploader-example {
  width: 880px;
  padding: 15px;
  margin: 40px auto 0;
  font-size: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
}
.uploader-example .uploader-btn {
  margin-right: 4px;
}
.uploader-example .uploader-list {
  max-height: 440px;
  overflow: auto;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>