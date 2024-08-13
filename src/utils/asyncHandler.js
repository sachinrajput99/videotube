const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>
    Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))//try catch block baar baar nh likhna pde isliye use kra hai
    
}
export {asyncHandler};